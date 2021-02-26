const message_pkgs = [
    {
        name:"std_msgs",
        messages: [
            "Bool",
            "Byte",
            "Int8",
            "Int16",
            "Int32",
            "Int64",
            "UInt8",
            "UInt16",
            "UInt32",
            "UInt64",
            "Float32",
            "Float64",
            "Char",
            "String",
            "ByteMultiArray",
            "Int8MultiArray",
            "Int16MultiArray",
            "Int32MultiArray",
            "Int64MultiArray",
            "UInt8MultiArray",
            "UInt16MultiArray",
            "UInt32MultiArray",
            "UInt64MultiArray",
            "Float32MultiArray",
            "Float64MultiArray",
            "Time",
            "ColorRGBA",
            "Duration",
            "Header",
            "Empty",
            "MultiArrayLayout",
            "MultiArrayDimension",
        ]
    },
    {
        name: "sensor_msgs",
        messages: [
            "BatteryState",
            "CameraInfo",
            "ChannelFloat32",
            "CompressedImage",
            "FluidPressure",
            "Illuminance",
            "Image",
            "Imu",
            "JointState",
            "JoyFeedbackArray",
            "JoyFeedback",
            "Joy",
            "LaserEcho",
            "LaserScan",
            "MagneticField",
            "MultiDOFJointState",
            "MultiEchoLaserScan",
            "NavSatFix",
            "NavSatStatus",
            "PointCloud2",
            "PointCloud",
            "PointField",
            "Range",
            "RegionOfInterest",
            "RelativeHumidity",
            "Temperature",
            "TimeReference"
        ]
    },
    {
        name: "geometry_msgs",
        messages: [
            "Accel",
            "AccelStamped",
            "AccelWithCovariance",
            "AccelWithCovarianceStamped",
            "Inertia",
            "InertiaStamped",
            "Point32",
            "Point",
            "PointStamped",
            "Polygon",
            "PolygonStamped",
            "Pose2D",
            "PoseArray",
            "Pose",
            "PoseStamped",
            "PoseWithCovariance",
            "PoseWithCovarianceStamped",
            "Quaternion",
            "QuaternionStamped",
            "Transform",
            "TransformStamped",
            "Twist",
            "TwistStamped",
            "TwistWithCovariance",
            "TwistWithCovarianceStamped",
            "Vector3",
            "Vector3Stamped",
            "Wrench",
            "WrenchStamped"
        ]
    },
    {
        name: "nav_msgs",
        messages: [
            "GridCells",
            "MapMetaData",
            "OccupancyGrid",
            "Odometry",
            "Path"
        ]
    },
    { 
        name: "shape_msgs",
        messages: [
            "Mesh",
            "MeshTriangle",
            "Plane",
            "SolidPrimitive"
        ]
    },
    { 
        name: "stereo_msgs",
        messages: [
            "DisparityImage"
        ]
    },
    {
        name: "trajectory_msgs",
        messages: [
            "JointTrajectory",
            "JointTrajectoryPoint",
            "MultiDOFJointTrajectory",
            "MultiDOFJointTrajectoryPoint"
        ]
    },
    {
        name: "visualization_msgs",
        messages: [
            "ImageMarker",
            "InteractiveMarker",
            "InteractiveMarkerControl",
            "InteractiveMarkerFeedback",
            "InteractiveMarkerInit",
            "InteractiveMarkerPose",
            "InteractiveMarkerUpdate",
            "Marker",
            "MarkerArray",
            "MenuEntry"
        ]
    },
    {
        name: "custom_msgs",
        messages: [
            "",
            "Add New Custom Message"
        ]
    }
]
export default message_pkgs;